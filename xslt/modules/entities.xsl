<?xml version="1.0" encoding="UTF-8"?>
<!--
    Module XSLT - Extraction d'Entités
    Templates pour extraire les entités de hiérarchie IFC
-->

<xsl:stylesheet version="2.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:ifc="http://www.buildingsmart-tech.org/ifcXML/IFC4/final"
    xmlns:ifc2x3="http://www.iai-tech.org/ifcXML/IFC2x3/FINAL"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    exclude-result-prefixes="ifc ifc2x3 xlink">

    <xsl:import href="common.xsl"/>

    <!-- Template pour IfcProject -->
    <xsl:template match="*[local-name()='IfcProject']" mode="ifc:entity">
        <xsl:text>"guid":"</xsl:text>
        <xsl:value-of select="ifc:extract-guid(.)"/>
        <xsl:text>","type":"IfcProject"</xsl:text>
        <xsl:variable name="name" select="ifc:extract-name(.)"/>
        <xsl:if test="$name">
            <xsl:text>,"name":"</xsl:text>
            <xsl:value-of select="replace($name, '&quot;', '\\&quot;')"/>
            <xsl:text>"</xsl:text>
        </xsl:if>
    </xsl:template>

    <!-- Template pour IfcSite -->
    <xsl:template match="*[local-name()='IfcSite']" mode="ifc:entity">
        <xsl:text>"guid":"</xsl:text>
        <xsl:value-of select="ifc:extract-guid(.)"/>
        <xsl:text>","type":"IfcSite"</xsl:text>
        <xsl:variable name="name" select="ifc:extract-name(.)"/>
        <xsl:if test="$name">
            <xsl:text>,"name":"</xsl:text>
            <xsl:value-of select="replace($name, '&quot;', '\\&quot;')"/>
            <xsl:text>"</xsl:text>
        </xsl:if>
    </xsl:template>

    <!-- Template pour IfcBuilding -->
    <xsl:template match="*[local-name()='IfcBuilding']" mode="ifc:entity">
        <xsl:text>"guid":"</xsl:text>
        <xsl:value-of select="ifc:extract-guid(.)"/>
        <xsl:text>","type":"IfcBuilding"</xsl:text>
        <xsl:variable name="name" select="ifc:extract-name(.)"/>
        <xsl:if test="$name">
            <xsl:text>,"name":"</xsl:text>
            <xsl:value-of select="replace($name, '&quot;', '\\&quot;')"/>
            <xsl:text>"</xsl:text>
        </xsl:if>
    </xsl:template>

    <!-- Template pour IfcBuildingStorey -->
    <xsl:template match="*[local-name()='IfcBuildingStorey']" mode="ifc:entity">
        <xsl:text>{"guid":"</xsl:text>
        <xsl:value-of select="ifc:extract-guid(.)"/>
        <xsl:text>","type":"IfcBuildingStorey"</xsl:text>
        <xsl:variable name="name" select="ifc:extract-name(.)"/>
        <xsl:if test="$name">
            <xsl:text>,"name":"</xsl:text>
            <xsl:value-of select="replace($name, '&quot;', '\\&quot;')"/>
            <xsl:text>"</xsl:text>
        </xsl:if>
        <xsl:variable name="elevation" select=".//*[local-name()='Elevation']"/>
        <xsl:if test="$elevation and normalize-space($elevation)">
            <xsl:text>,"elevation":</xsl:text>
            <xsl:value-of select="normalize-space($elevation)"/>
        </xsl:if>
        <xsl:text>}</xsl:text>
    </xsl:template>

    <!-- Template pour IfcSpace -->
    <xsl:template match="*[local-name()='IfcSpace']" mode="ifc:entity">
        <xsl:text>{"guid":"</xsl:text>
        <xsl:value-of select="ifc:extract-guid(.)"/>
        <xsl:text>","type":"IfcSpace"</xsl:text>
        <xsl:variable name="name" select="ifc:extract-name(.)"/>
        <xsl:if test="$name">
            <xsl:text>,"name":"</xsl:text>
            <xsl:value-of select="replace($name, '&quot;', '\\&quot;')"/>
            <xsl:text>"</xsl:text>
        </xsl:if>
        <xsl:variable name="tag" select=".//*[local-name()='Tag']"/>
        <xsl:if test="$tag and normalize-space($tag)">
            <xsl:text>,"number":"</xsl:text>
            <xsl:value-of select="replace(normalize-space($tag), '&quot;', '\\&quot;')"/>
            <xsl:text>"</xsl:text>
        </xsl:if>
        <xsl:text>}</xsl:text>
    </xsl:template>

</xsl:stylesheet>

